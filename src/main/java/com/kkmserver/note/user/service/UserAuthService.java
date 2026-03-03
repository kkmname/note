package com.kkmserver.note.user.service;

import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

import com.kkmserver.note.user.domain.UserPrincipal;
import com.kkmserver.note.user.repository.UserRepository;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class UserAuthService implements UserDetailsService {
    
    private final UserRepository userRepository;

    @Override
    public UserDetails loadUserByUsername(String email) throws UsernameNotFoundException {
        return userRepository.findByEmail(email)
                             .map(UserPrincipal::new)
                             .orElseThrow(
                                () -> new UsernameNotFoundException("User not found with email: " + email)
                             );
    }
}
